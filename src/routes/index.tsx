import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
	component: WineApp,
});

function WineApp() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-900 via-red-900 to-amber-900">
			{/* Navigation */}
			<nav className="navbar bg-base-100/10 backdrop-blur-sm border-b border-white/10">
				<div className="navbar-start">
					<div className="dropdown">
						<button type="button" tabIndex={0} className="btn btn-ghost lg:hidden">
							<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-label="Menu">
								<title>Menu</title>
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" />
							</svg>
						</button>
						<ul className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
							<li>
								<a href="#collection">Collection</a>
							</li>
							<li>
								<a href="#about">About</a>
							</li>
							<li>
								<a href="#contact">Contact</a>
							</li>
						</ul>
					</div>
					<a href="/" className="btn btn-ghost text-xl text-white">
						🍷 Wine Journal
					</a>
				</div>
				<div className="navbar-center hidden lg:flex">
					<ul className="menu menu-horizontal px-1">
						<li>
							<a href="#collection" className="text-white hover:text-amber-300">
								Collection
							</a>
						</li>
						<li>
							<a href="#about" className="text-white hover:text-amber-300">
								About
							</a>
						</li>
						<li>
							<a href="#contact" className="text-white hover:text-amber-300">
								Contact
							</a>
						</li>
					</ul>
				</div>
				<div className="navbar-end">
					<button type="button" className="btn btn-primary">
						Start Tasting
					</button>
				</div>
			</nav>

			{/* Hero Section */}
			<div
				className="hero min-h-screen"
				style={{
					background: `linear-gradient(rgba(0, 0, 0, 0.6), rgba(0, 0, 0, 0.6)), url('https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=2070')`,
					backgroundSize: "cover",
					backgroundPosition: "center",
					backgroundRepeat: "no-repeat",
				}}
			>
				<div className="hero-content text-center text-neutral-content">
					<div className="max-w-md">
						<h1 className="mb-5 text-5xl font-bold">A Decade of Wine</h1>
						<p className="mb-5 text-lg">
							Documenting over ten years of wine tasting adventures, from bold reds to crisp whites. Every bottle tells
							a story, every sip a memory.
						</p>
						<button type="button" className="btn btn-primary">
							Explore Collection
						</button>
					</div>
				</div>
			</div>

			{/* Stats Section */}
			<div className="py-16 bg-base-100/5">
				<div className="container mx-auto px-4">
					<div className="stats shadow w-full bg-base-100/10 backdrop-blur-sm">
						<div className="stat">
							<div className="stat-figure text-primary">
								<svg
									className="w-8 h-8"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									aria-label="Bottles Tasted"
									role="img"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
									/>
								</svg>
							</div>
							<div className="stat-title text-white">Bottles Tasted</div>
							<div className="stat-value text-primary">500+</div>
							<div className="stat-desc text-white/70">Over 10 years</div>
						</div>

						<div className="stat">
							<div className="stat-figure text-secondary">
								<svg
									className="w-8 h-8"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									aria-label="Wineries Visited"
									role="img"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
									/>
								</svg>
							</div>
							<div className="stat-title text-white">Wineries Visited</div>
							<div className="stat-value text-secondary">50+</div>
							<div className="stat-desc text-white/70">From Napa to Bordeaux</div>
						</div>

						<div className="stat">
							<div className="stat-figure text-accent">
								<svg
									className="w-8 h-8"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									aria-label="Favorite Varietals"
									role="img"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth="2"
										d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
									/>
								</svg>
							</div>
							<div className="stat-title text-white">Favorite Varietals</div>
							<div className="stat-value text-accent">12</div>
							<div className="stat-desc text-white/70">From Cabernet to Riesling</div>
						</div>
					</div>
				</div>
			</div>

			{/* Featured Wines Section */}
			<div className="py-16 bg-base-100/10">
				<div className="container mx-auto px-4">
					<h2 className="text-3xl font-bold text-center text-white mb-12">Recent Tastings</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{/* Wine Card 1 */}
						<div className="card bg-base-100/10 backdrop-blur-sm shadow-xl">
							<figure className="px-6 pt-6">
								<img
									src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
									alt="Red Wine"
									className="rounded-xl h-48 w-full object-cover"
								/>
							</figure>
							<div className="card-body">
								<h3 className="card-title text-white">Château Margaux 2015</h3>
								<p className="text-white/70">Bordeaux, France</p>
								<div className="rating rating-sm">
									<input type="radio" name="rating-1" className="mask mask-star-2 bg-orange-400" />
									<input type="radio" name="rating-1" className="mask mask-star-2 bg-orange-400" />
									<input type="radio" name="rating-1" className="mask mask-star-2 bg-orange-400" />
									<input type="radio" name="rating-1" className="mask mask-star-2 bg-orange-400" />
									<input type="radio" name="rating-1" className="mask mask-star-2 bg-orange-400" defaultChecked />
								</div>
								<p className="text-white/80">
									Elegant with notes of blackberry, tobacco, and leather. A truly exceptional vintage.
								</p>
								<div className="card-actions justify-end">
									<button type="button" className="btn btn-primary btn-sm">
										Read Notes
									</button>
								</div>
							</div>
						</div>

						{/* Wine Card 2 */}
						<div className="card bg-base-100/10 backdrop-blur-sm shadow-xl">
							<figure className="px-6 pt-6">
								<img
									src="https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
									alt="White Wine"
									className="rounded-xl h-48 w-full object-cover"
								/>
							</figure>
							<div className="card-body">
								<h3 className="card-title text-white">Dom Pérignon 2012</h3>
								<p className="text-white/70">Champagne, France</p>
								<div className="rating rating-sm">
									<input type="radio" name="rating-2" className="mask mask-star-2 bg-orange-400" />
									<input type="radio" name="rating-2" className="mask mask-star-2 bg-orange-400" />
									<input type="radio" name="rating-2" className="mask mask-star-2 bg-orange-400" />
									<input type="radio" name="rating-2" className="mask mask-star-2 bg-orange-400" defaultChecked />
									<input type="radio" name="rating-2" className="mask mask-star-2 bg-orange-400" />
								</div>
								<p className="text-white/80">
									Crisp and refined with delicate bubbles and notes of citrus and brioche.
								</p>
								<div className="card-actions justify-end">
									<button type="button" className="btn btn-primary btn-sm">
										Read Notes
									</button>
								</div>
							</div>
						</div>

						{/* Wine Card 3 */}
						<div className="card bg-base-100/10 backdrop-blur-sm shadow-xl">
							<figure className="px-6 pt-6">
								<img
									src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80"
									alt="Wine Bottle"
									className="rounded-xl h-48 w-full object-cover"
								/>
							</figure>
							<div className="card-body">
								<h3 className="card-title text-white">Opus One 2018</h3>
								<p className="text-white/70">Napa Valley, California</p>
								<div className="rating rating-sm">
									<input type="radio" name="rating-3" className="mask mask-star-2 bg-orange-400" />
									<input type="radio" name="rating-3" className="mask mask-star-2 bg-orange-400" />
									<input type="radio" name="rating-3" className="mask mask-star-2 bg-orange-400" />
									<input type="radio" name="rating-3" className="mask mask-star-2 bg-orange-400" />
									<input type="radio" name="rating-3" className="mask mask-star-2 bg-orange-400" defaultChecked />
								</div>
								<p className="text-white/80">
									Bold and complex with rich dark fruit, vanilla, and a long, smooth finish.
								</p>
								<div className="card-actions justify-end">
									<button type="button" className="btn btn-primary btn-sm">
										Read Notes
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{/* CTA Section */}
			<div className="py-16 bg-gradient-to-r from-purple-900 to-red-900">
				<div className="container mx-auto px-4 text-center">
					<h2 className="text-3xl font-bold text-white mb-6">Start Your Wine Journey</h2>
					<p className="text-white/80 mb-8 max-w-2xl mx-auto">
						Join me in exploring the world of fine wines. From everyday bottles to rare vintages, every wine has a story
						worth sharing.
					</p>
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<button type="button" className="btn btn-primary btn-lg">
							Browse Collection
						</button>
						<button
							type="button"
							className="btn btn-outline btn-lg text-white border-white hover:bg-white hover:text-purple-900"
						>
							Learn More
						</button>
					</div>
				</div>
			</div>

			{/* Footer */}
			<footer className="footer footer-center p-10 bg-base-100/5 text-white">
				<nav className="grid grid-flow-col gap-4">
					<a href="#about" className="link link-hover">
						About
					</a>
					<a href="#contact" className="link link-hover">
						Contact
					</a>
					<a href="#privacy" className="link link-hover">
						Privacy Policy
					</a>
					<a href="#terms" className="link link-hover">
						Terms of Service
					</a>
				</nav>
				<nav>
					<div className="grid grid-flow-col gap-4">
						<a href="#facebook">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								className="fill-current"
								aria-label="Facebook"
								role="img"
							>
								<path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z" />
							</svg>
						</a>
						<a href="#twitter">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								className="fill-current"
								aria-label="Twitter"
								role="img"
							>
								<path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
							</svg>
						</a>
						<a href="#instagram">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="24"
								height="24"
								viewBox="0 0 24 24"
								className="fill-current"
								aria-label="Instagram"
								role="img"
							>
								<path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z" />
							</svg>
						</a>
					</div>
				</nav>
				<aside>
					<p>Copyright © 2025 - All rights reserved by Wine Journal</p>
				</aside>
			</footer>
		</div>
	);
}
